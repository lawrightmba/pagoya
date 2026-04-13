import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pagoyaRouter from "./pagoya";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/pagoya", pagoyaRouter);

export default router;
